# DefaultApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**usersIdGet**](DefaultApi.md#usersIdGet) | **GET** /users/{id}/ |  returns user by id
[**usersPost**](DefaultApi.md#usersPost) | **POST** /users/ | 


<a name="usersIdGet"></a>
# **usersIdGet**
> IUser usersIdGet(id)

 returns user by id

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **BigDecimal**|  | [default to null]

### Return type

[**IUser**](..//Models/IUser.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="usersPost"></a>
# **usersPost**
> IResult usersPost(inlineObject)



### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **inlineObject** | [**InlineObject**](..//Models/InlineObject.md)|  |

### Return type

[**IResult**](..//Models/IResult.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

