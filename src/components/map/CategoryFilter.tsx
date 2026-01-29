'use client'

import { useState, useEffect, useMemo } from 'react'
import { Filter } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
}

interface CategoryFilterProps {
  categories: Category[]
  onFilterChange: (categoryIds: string[]) => void
  enabled: boolean
}

export default function CategoryFilter({ 
  categories, 
  onFilterChange,
  enabled 
}: CategoryFilterProps) {
  // Memoize initial category IDs to avoid recreating Set on every render
  const initialCategoryIds = useMemo(
    () => new Set(categories.map(c => c.id)),
    [categories]
  )
  
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(initialCategoryIds)

  // Only update when categories actually change (by comparing IDs)
  useEffect(() => {
    const currentIds = Array.from(selectedCategories).sort().join(',')
    const newIds = categories.map(c => c.id).sort().join(',')
    
    // Only update if the category list has actually changed
    if (currentIds !== newIds && categories.length > 0) {
      setSelectedCategories(new Set(categories.map(c => c.id)))
    }
  }, [categories, selectedCategories])

  if (!enabled || categories.length === 0) {
    return null
  }

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategories(newSelected)
    onFilterChange(Array.from(newSelected))
  }

  const toggleAll = () => {
    if (selectedCategories.size === categories.length) {
      // Deselect all
      setSelectedCategories(new Set())
      onFilterChange([])
    } else {
      // Select all
      const allIds = new Set(categories.map(c => c.id))
      setSelectedCategories(allIds)
      onFilterChange(Array.from(allIds))
    }
  }

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-white">Filter by Category</span>
      </div>
      
      <div className="space-y-2">
        {/* All button */}
        <button
          onClick={toggleAll}
          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCategories.size === categories.length
              ? 'bg-[#FC4C02] text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          All Categories
        </button>

        {/* Category buttons */}
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedCategories.has(category.id)
                ? 'text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={{
              backgroundColor: selectedCategories.has(category.id) 
                ? category.color 
                : undefined
            }}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}
